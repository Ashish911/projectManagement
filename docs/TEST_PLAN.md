# ProjoMan — Manual QA Test Plan

> Click-through test cases for the whole running system: browser → GraphQL API → MongoDB / Redis → notification worker → WebSocket.

| | |
|---|---|
| **Audience** | Anyone testing a build by hand before a release or after a large change |
| **Last reviewed** | 2026-10-10 |
| **Related** | [BACKEND.md](BACKEND.md) (rules and errors per operation) · [FRONTEND.md](FRONTEND.md) (screens) · [../server/STATUS.md](../server/STATUS.md) · [../frontend/STATUS.md](../frontend/STATUS.md) |

The automated suites (Jest on the server, Vitest on the frontend) mock their boundaries. This plan covers what they can't: the real stack, real roles and live notifications.

---

## Table of Contents

1. [How to Use This Plan](#1-how-to-use-this-plan)
2. [Environment Setup](#2-environment-setup)
3. [Test Data and Personas](#3-test-data-and-personas)
4. [Test Cases](#4-test-cases)
   - [4.1 Auth](#41-auth--auth) · [4.2 Routing & navigation](#42-routing--navigation--nav) · [4.3 Users](#43-users--usr) · [4.4 Clients](#44-clients--cli) · [4.5 Projects](#45-projects--prj) · [4.6 Tasks](#46-tasks--tsk) · [4.7 Sub-tasks](#47-sub-tasks--sub) · [4.8 Comments](#48-comments--cmt) · [4.9 Notifications](#49-notifications--ntf) · [4.10 Dashboards & analytics](#410-dashboards--analytics--dsh) · [4.11 Account & preferences](#411-account--preferences--acc) · [4.12 Security / API](#412-security--api--sec) · [4.13 Operations](#413-operations--ops)
5. [Regression Smoke Checklist](#5-regression-smoke-checklist)
6. [Known Issues to Expect](#6-known-issues-to-expect)
7. [Appendix — API Operation Coverage](#appendix--api-operation-coverage)

---

## 1. How to Use This Plan

1. Set up the environment ([§2](#2-environment-setup)) and run both unit suites first. If they fail, stop and fix them before testing by hand.
2. Create the personas and seed data **once** ([§3](#3-test-data-and-personas)). Most cases depend on them.
3. Work through [§4](#4-test-cases) in order. Later sections assume the data created earlier (e.g. tasks exist before comments).
4. Mark each case in its **Result** column: `✅` pass, `❌` fail, `⏭` skipped. On a fail, write the case ID, what you saw and any console/server log lines in your bug tracker.
5. After a fix, re-run the failing case plus the [smoke checklist](#5-regression-smoke-checklist).

**Conventions**
- **Role** is the persona you are signed in as (see §3).
- **UI** steps are done in the browser at `http://localhost:4000`.
- **API** steps send raw GraphQL to `http://localhost:8000/graphql`, for checks the UI hides (e.g. a `USER` calling an admin mutation). Use Apollo Sandbox (introspection is on in dev) or `curl`:

  ```bash
  TOKEN=...   # copy localStorage.token from the browser devtools, or from a login response
  curl -s http://localhost:8000/graphql \
    -H 'Content-Type: application/json' \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"query":"mutation CreateTask { createTask(title:\"x\", projectId:\"<id>\") { id } }"}'
  ```

- Errors come back as `errors[0].message` with `extensions.code` (`UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION_ERROR`, `CONFLICT`). "Expected" columns quote the code and, where it matters, the message.
- For live notification cases, use **two browsers** (or a normal + a private window), one per persona.

---

## 2. Environment Setup

### Option A — Docker (recommended: includes the worker, Redis, Prometheus and Grafana)

```bash
cd server
cp .env.example .env.local      # fill MONGO_URI and SECRET_KEY (≥ 32 chars)
docker compose --profile dev up -d --build
```

Services: API `:8000`, metrics `:9090`, Prometheus `:9091`, Grafana `:3001`, plus `worker` and `redis`.

### Option B — Local processes

```bash
# Terminal 1 — Redis
redis-server
# Terminal 2 — API
cd server && npm install && npm run dev
# Terminal 3 — notification worker
cd server && npx env-cmd -f .env.local node worker/notification.worker.js
# Terminal 4 — frontend (port 4000)
cd frontend && npm install && npm run dev
```

### Environment variables that change behaviour under test

| Variable | Effect on testing |
|---|---|
| `BIRD_API_KEY` | Without it **no email is sent**. Forgot-password and invite cases then need the token read another way (see AUTH-12 note). |
| `APP_URL` | Base of reset/invite links. Must be `http://localhost:4000` locally. |
| `NODE_ENV` | `development` enables introspection and the in-app rate limiter (100 req/min per IP per operation); `production` disables both. |

### Smoke gate — run before any manual testing

```bash
cd server && node --experimental-vm-modules node_modules/.bin/jest     # all suites green
cd frontend && npm run test:run                                          # all suites green
curl -s localhost:8000/health/ready                                       # mongo: up
```

---

## 3. Test Data and Personas

### 3.1 Bootstrap the first super admin

Public sign-up always creates a `USER`, and no seed script exists. Create the first super admin by hand:

1. Register `sa@test.local` through the UI (`/register`).
2. Promote it in MongoDB:
   ```js
   // mongosh "<MONGO_URI>"
   db.users.updateOne({ email: "sa@test.local" }, { $set: { role: "SUPER_ADMIN" } })
   ```
3. Sign in as SA. Every other persona is created from the UI by SA.

### 3.2 Personas

Use one password for all, e.g. `Passw0rd!23`.

| Persona | Email | Role | Belongs to |
|---|---|---|---|
| **SA** | `sa@test.local` | SUPER_ADMIN | — |
| **CA-A** | `ca.a@test.local` | CLIENT_ADMIN | Client A |
| **CA-B** | `ca.b@test.local` | CLIENT_ADMIN | Client B |
| **U-1** | `u1@test.local` | USER | Project A1 (team) |
| **U-2** | `u2@test.local` | USER | Project A1 (team) |
| **U-3** | `u3@test.local` | USER | Project B1 only, an **outsider** to Client A |
| **U-NEW** | created during tests | USER | — |

### 3.3 Seed data

| Object | Owner | Details |
|---|---|---|
| Client A | admin CA-A | email `a@client.local` |
| Client B | admin CA-B | email `b@client.local` |
| Client C | no admin | used for "Needs attention" and assign-admin cases |
| Project A1 | Client A | team U-1, U-2; status IN_PROGRESS; due in 14 days |
| Project A2 | Client A | empty team; NOT_STARTED |
| Project B1 | Client B | team U-3 |
| Task T1 | Project A1 | assigned U-1, priority HIGH, deadline tomorrow |
| Task T2 | Project A1 | assigned U-2, deadline **yesterday** (overdue) |
| Task T3 | Project A1 | unassigned, NORMAL |
| Task TB | Project B1 | assigned U-3 |
| Sub-task S1 | under T1 | assigned U-1 |

Write down the ids of A1, B1, T1, TB and S1 (from the URL, the network tab, or `mongosh`). The API cases need them.

---

## 4. Test Cases

### 4.1 Auth — AUTH

| ID | Role | Steps | Expected | Result |
|---|---|---|---|---|
| AUTH-01 | — | `/register`: fill name, email, phone, DOB, gender, password (≥ 8). Submit. | Account created; you can sign in. In Users (as SA) the account shows role **USER**. | |
| AUTH-02 | — | API: `mutation RegisterMutation { register(..., role: "SUPER_ADMIN") {...} }` | Rejected by GraphQL validation: unknown argument `role`. No role can be chosen at sign-up. | |
| AUTH-03 | — | Register again with an email that already exists. | `CONFLICT`; a clear error is shown; no second account. | |
| AUTH-04 | — | Register with a 7-character password / invalid email / empty name. | `VALIDATION_ERROR`; field errors shown; nothing created. | |
| AUTH-05 | — | Sign in with correct credentials. | Redirected to `/dashboard`; `localStorage.token` set; sidebar shows the role's links. | |
| AUTH-06 | — | Sign in with a wrong password, then with an unknown email. | Both show exactly **"Invalid email or password"**. | |
| AUTH-07 | — | Use U-NEW. Enter a wrong password 5 times, then the correct one. | 6th attempt is refused with a locked-account message even though the password is right. As SA, Users shows U-NEW as **Locked**. | |
| AUTH-08 | SA | Users → select U-NEW → bulk **Unlock**. Then sign in as U-NEW. | Status back to Active; sign-in succeeds. | |
| AUTH-09 | — | Forgot password with an existing email, then with an unknown email. | Same message both times: "If an account exists for this email, a password reset link has been sent." Response `token` is `null`. | |
| AUTH-10 | — | Open the reset link from the email (`/reset-password?token=…`). Set a new password. Sign in with it. | "Password reset successful."; new password works; old one fails. | |
| AUTH-11 | — | Open the same reset link again and submit. | Refused ("Invalid or expired reset token"): tokens are single-use. | |
| AUTH-12 | — | Expired token: in mongosh set `resetTokenExpiry` to the past for the user, then submit the link. | `UNAUTHORIZED` "Reset token has expired". *(Without `BIRD_API_KEY` there is no email. Only the hash is stored, so the raw token can't be read from the DB; set the key, or watch the email service log.)* | |
| AUTH-13 | — | Forgot password with a badly formatted email. | `VALIDATION_ERROR`. | |
| AUTH-14 | any | Account menu → Change password: wrong current password; then correct current + 7-char new; then valid. | "Current password is incorrect"; then a length error; then success. The new password works on the next sign-in. | |
| AUTH-15 | any | Sign out. | Back to `/`; `localStorage.token` removed; WebSocket closed (devtools → Network → WS). Back button doesn't reveal signed-in pages. | |
| AUTH-16 | any | Sign in, then edit `localStorage.token` to an expired JWT (or wait 1 h), reload. | The store drops the expired token on startup; you land on `/`. | |
| AUTH-17 | any | While signed in, corrupt `localStorage.token` (change one character) and trigger any action. | Request gets `UNAUTHORIZED`; an error is shown; no blank screen. | |

### 4.2 Routing & navigation — NAV

| ID | Role | Steps | Expected | Result |
|---|---|---|---|---|
| NAV-01 | — | Signed out, open `/dashboard`, `/tasks`, `/projects/<A1>`. | Each redirects to `/`. | |
| NAV-02 | any | Signed in, open `/`, `/register`, `/forgot-password`. | Redirect to `/dashboard`. | |
| NAV-03 | SA | Check the sidebar. | Dashboard, Users, Clients, Projects, Tasks. | |
| NAV-04 | CA-A | Check the sidebar. | Dashboard, Clients, Projects, Tasks, Analytics. | |
| NAV-05 | U-1 | Check the sidebar. | Dashboard, Projects, Tasks. | |
| NAV-06 | CA-A | Type `/users` in the address bar. | Redirect to `/dashboard`. | |
| NAV-07 | U-1 | Type `/users`, `/clients`, `/analytics`. | Each redirects to `/dashboard`. | |
| NAV-08 | SA | Type `/analytics` (not in SA's sidebar). | Page loads. The route allows SA. | |
| NAV-09 | any | Open `/kanban`. | Replaced by `/tasks`. | |
| NAV-10 | any | Press ⌘K / Ctrl+K, or click the header search. Search for a project and a task, pick one. | Palette opens; results are limited to what the role can see; selecting navigates. Esc closes. | |
| NAV-11 | any | Collapse the sidebar; reload. | Collapses to a 64 px icon rail; nav still works. | |
| NAV-12 | any | Open `/projects/<A1>`. | Header breadcrumb `Projects › Project A1`. | |
| NAV-13 | any | Resize to phone width (~375 px). | Sidebar becomes off-canvas; no horizontal page scroll on Dashboard/Tasks. *(Some tables are not adapted yet: F-9.)* | |

### 4.3 Users — USR

All as **SA** unless stated.

| ID | Role | Steps | Expected | Result |
|---|---|---|---|---|
| USR-01 | SA | Open Users. | Table with role, client, projects, open tasks, last seen, status. Role tabs filter; search filters by name/email. | |
| USR-02 | SA | Invite person, mode **Invite**, role USER, a new email. | User created with status **Invited**. Email arrives (if Bird is configured) with a link `…/reset-password?token=…&invite=1`. | |
| USR-03 | — | Open the invite link, set a password, sign in. | Works. As SA, the status changes to **Active**. *(The page still says "reset", not "set your password": F-6.)* | |
| USR-04 | SA | Invite person, mode **Temporary password**, password of 7 chars; then 8+. | First: length error. Second: user created **Active** and can sign in with that password. | |
| USR-05 | SA | Invite with role **CLIENT_ADMIN** and no client. | "Pick the client they'll manage" (`VALIDATION_ERROR`). | |
| USR-06 | SA | Invite with role CLIENT_ADMIN for **Client A** (already has CA-A). | `CONFLICT` "That client already has a client admin". | |
| USR-07 | SA | Invite with role CLIENT_ADMIN for **Client C**. | Created; Client C now shows this admin. | |
| USR-08 | SA | Invite with an email that already exists. | `CONFLICT` "Someone already uses this email". | |
| USR-09 | SA | Edit U-2: change name and phone; then change the email to U-1's email. | First saves and shows immediately. Second: `CONFLICT`. | |
| USR-10 | SA | Edit an Invited user → Resend invite. | "Invite sent to {email}"; a new link works and the old one fails. | |
| USR-11 | SA | Resend invite for an Active user (e.g. via API `resendInvite`). | `CONFLICT` "This user has already signed in". | |
| USR-12 | SA | Select U-1 and U-2 → Change role → CLIENT_ADMIN. | "A client admin needs exactly one person and a client" (`VALIDATION_ERROR`). | |
| USR-13 | SA | API: `changeUserRoles(ids:[<SA id>], role:"USER")` while SA is the only super admin. | `CONFLICT` "At least one super admin must remain". *(In the UI you can't select yourself; see USR-15.)* | |
| USR-14 | SA | Change U-NEW's role USER → CLIENT_ADMIN (with a client without admin) and back to USER. | Roles update. U-NEW gets a "Your role was changed to …" notification each time; when demoted, the client loses its admin. | |
| USR-15 | SA | Try to tick your own row; select some rows, then switch role tab. | Your own row can't be selected; switching tabs clears the selection. | |
| USR-16 | SA | Export → CSV, pick 3 columns; then JSON. | Live preview matches the chosen columns; downloaded files contain exactly the visible/filtered users. | |
| USR-17 | SA | Delete U-NEW (assign them a task and a project team first). | 5 s Undo toast. After it expires: user gone; their task is now unassigned; they're removed from the project team. | |
| USR-18 | SA | Delete U-NEW2, then press **Undo** within 5 s. | Nothing is deleted. | |
| USR-19 | SA | API: `deleteUser(userId:<SA id>)` and `deleteUsers(ids:[<SA id>, <U-x>])`. | Both `FORBIDDEN` "You cannot delete your own account". The bulk call deletes **nothing**. | |
| USR-20 | SA | Delete a CLIENT_ADMIN. | Their client shows "no admin" and appears under Clients → Needs attention. | |
| USR-21 | SA | API: `promoteToAdmin(userId:<U-x>)`; then call it again on the same user. | First: role CLIENT_ADMIN, user notified "You have been promoted to Client Admin." Second: `CONFLICT` "User is already a admin." | |
| USR-22 | CA-A | API: `users`. | Only users on Client A's projects (U-1, U-2), not U-3. | |
| USR-23 | U-1 | API: `users`, `user(id:<U-2>)`. | `FORBIDDEN`. | |

### 4.4 Clients — CLI

| ID | Role | Steps | Expected | Result |
|---|---|---|---|---|
| CLI-01 | SA | Clients → New client: name only. | Created; appears in the table and under **Needs attention** (no admin). | |
| CLI-02 | SA | New client with the same email as Client A. | `CONFLICT` "Client with this email already exists". | |
| CLI-03 | SA | Create two clients with **no** email. | Both succeed (the email index is partial). | |
| CLI-04 | SA | Edit Client B's name/phone. | Saved and visible after reload. | |
| CLI-05 | SA | Assign admin on Client C → pick a CLIENT_ADMIN without a client. | Client C shows the admin; that admin is notified: *You have been assigned as admin for client "C".* | |
| CLI-06 | SA | Assign CA-B (already admin of B) to Client C. | `CONFLICT` "User is already assigned to a different client". | |
| CLI-07 | SA | API: `assignAdmin` with a USER's id. | `FORBIDDEN` "User does not have CLIENT_ADMIN role". | |
| CLI-08 | CA-A | Open Clients. | Sees **only Client A**; can edit it; "Request deletion" is available. | |
| CLI-09 | CA-A | API: `client(id:<Client B>)`, `updateClient(id:<Client B>, …)`. | `FORBIDDEN`. | |
| CLI-10 | CA-A | Request deletion of Client A. | Client A shows a pending deletion. SA's dashboard "Needs a decision" strip and Clients → Delete requested both list it. | |
| CLI-11 | SA | Decline Client A's request with the message "Still active". | `deleteRequest` back to false. CA-A is notified with the decline text **and** the message. | |
| CLI-12 | SA | API: `declineClientDeletion` on a client with no request. | `CONFLICT`. | |
| CLI-13 | SA | API: `deleteClientBySuperAdmin` on a client with no request. | `CONFLICT` "Delete request not found for this client." | |
| CLI-14 | CA-A → SA | CA-A requests deletion again; SA **Approves**. | Client deleted after the Undo window. *(Use a throwaway client/admin if you need Client A later.)* | |
| CLI-15 | SA | Force delete a client: type a wrong name, then the right one. | Button stays disabled until the typed confirmation matches; then deleted. | |
| CLI-16 | U-1 | API: `clients`. | `FORBIDDEN`. | |
| CLI-17 | CA-A | **Known issue S-1:** API `updateClient(id:<Client A>, name:…, email:…, assignedAdmin:<other CA id>)`. | *Expected (correct):* FORBIDDEN or ignored. *Today:* it is saved. Record as **known fail**. | |

### 4.5 Projects — PRJ

| ID | Role | Steps | Expected | Result |
|---|---|---|---|---|
| PRJ-01 | SA | Projects → New project for Client B: name, description, status, due date. | Live card preview updates while typing; the project appears in the grid. | |
| PRJ-02 | CA-A | New project. | The client is fixed to / limited to Client A. | |
| PRJ-03 | CA-A | API: `addProject(name:"x", clientId:<Client B>)`. | `FORBIDDEN` "You are not the admin of this client". | |
| PRJ-04 | any admin | Project description with 501+ characters. | `VALIDATION_ERROR` (max 500). | |
| PRJ-05 | SA / CA-A / U-1 | Open Projects as each. | SA: all projects. CA-A: A1, A2 only. U-1: A1 only. | |
| PRJ-06 | U-1 | Open `/projects/<B1>`, and API `project(id:<B1>)`. | Not shown / `FORBIDDEN`. | |
| PRJ-07 | any | Status tabs and search on Projects. | Grid filters correctly; counts on tabs match. | |
| PRJ-08 | CA-A | Edit A2: status IN_PROGRESS, clear the due date. | Saved; card shows no due date. | |
| PRJ-09 | CA-A | A2 → Team → add U-1 and U-2. | Both appear on the team; each gets *You have been added to project "A2".* | |
| PRJ-10 | CA-A | Add U-1 to A2 again. | No duplicate; no second notification. | |
| PRJ-11 | CA-A | Remove U-2 from A2. Then API remove U-2 again. | Removed. Second call: `CONFLICT` "None of the specified users are assigned to this project". | |
| PRJ-12 | U-1 | Remove U-1 from A2 → refresh U-1's Projects. | A2 is gone from U-1's list. | |
| PRJ-13 | any | Project detail for A1. | Header status + due date; progress and burn-down match the task counts; open / overdue / resolved counts (T2 overdue); "Up next"; tasks by status; team list. | |
| PRJ-14 | CA-A | Delete A2 (typed confirmation / Undo). | Project gone from the grid and from U-1's list. | |
| PRJ-15 | CA-B | API: `updateProject`/`deleteProject` on A1. | `FORBIDDEN`. | |
| PRJ-16 | U-1 | API: `addProject`, `updateProject(A1)`, `deleteProject(A1)`. | `FORBIDDEN`. | |

### 4.6 Tasks — TSK

| ID | Role | Steps | Expected | Result |
|---|---|---|---|---|
| TSK-01 | CA-A | Tasks → New task in A1: title, assignee U-2, priority URGENT, deadline Friday. | Task in the **New** column. U-2 gets *You have been assigned a new task: {title}.* | |
| TSK-02 | U-1 | Look for "New task". | Not available. API `createTask` → `FORBIDDEN`. | |
| TSK-03 | SA | Board view. | Four columns (New / In progress / Resolved / Reopened), every task visible. | |
| TSK-04 | U-1 | Board view. | Only U-1's own tasks; no All/Mine toggle. | |
| TSK-05 | CA-A | Toggle All / Mine. | All = Client A's tasks only (never TB). Mine = tasks assigned to CA-A. | |
| TSK-06 | CA-A | Drag T3 New → In progress. Reload. | Status persisted. | |
| TSK-07 | U-1 | Drag T1 (own) to In progress; try to drag T2 (U-2's, if visible via a project view). | T1 moves and persists. T2 can't be moved / is refused. | |
| TSK-08 | U-1 | Resolve T1 (drag to Resolved, or the one-click resolve). | Status RESOLVED; T1's creator **and** assignee (if different) get *Task "T1" has been marked as resolved.* | |
| TSK-09 | CA-A | Reopen T1. | Status REOPENED; the creator gets *Task "T1" has been reopened.* | |
| TSK-10 | CA-A | Open T3's sheet: edit the title inline, set priority, assign U-1, set a deadline. | Each change saves as you go (no Save button); U-1 gets an assignment notification. | |
| TSK-11 | CA-A | In a sheet, clear the deadline and the assignee. | Both null after reload. | |
| TSK-12 | U-1 | Edit T1 (own) title in the sheet; API `updateTask` on T2 (U-2's). | Own: saved. Other's: `FORBIDDEN`. | |
| TSK-13 | any | List view. | Grouped by due date; T2 marked **overdue**; rows expand to show sub-tasks with a done/total chip. | |
| TSK-14 | CA-A | Delete a task that has a sub-task and comments; let the Undo expire. | Task gone. Its sub-tasks and comments are gone too (`mongosh`: no `subtasks`/`comments` rows with that `task` / `taskId`). The assignee gets *Task "{title}" has been deleted.* | |
| TSK-15 | CA-A | Delete a task and press Undo. | Task stays. | |
| TSK-16 | U-1 | API: `deleteTask(T1)`. | `FORBIDDEN`. | |
| TSK-17 | U-3 | API: `tasks(projectId:<A1>)`, `task(id:<T1>)`, `allTasks`. | First two `FORBIDDEN`; `allTasks` contains only TB. | |
| TSK-18 | CA-B | **Known issue S-2:** API `tasks(projectId:<A1>)` and `task(id:<T1>)`. | *Expected (correct):* FORBIDDEN. *Today:* returns Client A's tasks. Record as **known fail**. | |
| TSK-19 | CA-A | API: `createTask` with `currentStatus:"RESOLVED"`. | Rejected; only NEW / IN_PROGRESS are allowed at creation. | |
| TSK-20 | any | API: `task(id:"123")`. | `VALIDATION_ERROR` (not a 24-hex ObjectId). | |
| TSK-21 | any admin | Two windows as different admins: change a task in one. | The other does **not** update live (F-7); it updates after reload. | |

### 4.7 Sub-tasks — SUB

| ID | Role | Steps | Expected | Result |
|---|---|---|---|---|
| SUB-01 | U-1 | Open T1 → add sub-task "Write docs". | Created under T1; the T1 chip shows the new total. | |
| SUB-02 | U-1 | Quick add: `Review PR !high @U-2 ^fri`. | Title "Review PR", priority HIGH, assignee U-2, due next Friday. U-2 is notified (*new subtask*). | |
| SUB-03 | U-1 | API: `createSubTask(taskId:<T2>)` (T2 is not U-1's). | `FORBIDDEN`. | |
| SUB-04 | U-1 | Resolve S1 (assigned to U-1). | Status RESOLVED; T1's done/total chip increments; creator + assignee notified. | |
| SUB-05 | U-2 | API: `updateSubTask`/`updateSubTaskStatus` on S1 (assigned to U-1). | `FORBIDDEN`. | |
| SUB-06 | U-1 | Delete the sub-task U-1 created (SUB-01). | Deleted; its comments deleted too. | |
| SUB-07 | U-1 | API: `deleteSubTask(S1)` (created by an admin). | `FORBIDDEN`. | |
| SUB-08 | CA-A | Edit and delete any sub-task in A1. | Allowed; assignee notified on delete. | |
| SUB-09 | U-3 | API: `subTasks(taskId:<T1>)`, `subTask(id:<S1>)`. | `FORBIDDEN`. | |

### 4.8 Comments — CMT

| ID | Role | Steps | Expected | Result |
|---|---|---|---|---|
| CMT-01 | U-1 | T1 sheet → add comment "On it". | Appears with name and time. T1's creator and assignee are notified, but not U-1 (the author). | |
| CMT-02 | U-2 | Comment on T1 (U-2 is on A1's team but not assigned). | Allowed: comments are open to every project member. | |
| CMT-03 | U-1 | Comment on S1. | Shown under S1 and **not** in T1's own comment list. | |
| CMT-04 | U-1 | Comment of only spaces; comment of 2001 chars. | Both rejected (`VALIDATION_ERROR`: trimmed, 1–2000). | |
| CMT-05 | U-1 | Edit own comment. | Updated; edited time changes. | |
| CMT-06 | U-2 | API: `updateComment` on U-1's comment. | `FORBIDDEN` "You can only edit your own comments". | |
| CMT-07 | U-2 | API: `deleteComment` on U-1's comment. | `FORBIDDEN` "You do not have permission to delete this comment". | |
| CMT-08 | CA-A | Delete U-1's comment on T1. | Allowed (client admin of the project). | |
| CMT-09 | CA-B | API: `taskComments(taskId:<T1>)`, `addTaskComment(taskId:<T1>, …)`. | `FORBIDDEN` "You are not a member of this project". | |
| CMT-10 | U-3 | Same as CMT-09. | `FORBIDDEN`. | |
| CMT-11 | SA | Comment on and delete any comment anywhere. | Allowed. | |
| CMT-12 | CA-A | Remove U-1 from A1, then U-1 tries to edit their old comment (API). | `FORBIDDEN`: editing requires current membership. *(Re-add U-1 afterwards.)* | |

### 4.9 Notifications — NTF

Use two browsers: the **actor** and the **recipient**. The recipient stays on any signed-in page.

| ID | Steps | Expected | Result |
|---|---|---|---|
| NTF-01 | Recipient signed in; actor triggers any event from the table in [BACKEND.md §14](BACKEND.md#14-notification-system) (e.g. CA-A assigns a task to U-1). | Within ~1 s the recipient sees a toast with an **Open** action and an unread dot on the bell, **without reloading**. | |
| NTF-02 | Go through the trigger table: promote, assign admin, add to project, create/reassign task, resolve/reopen, delete task, sub-task create/reassign/resolve/reopen/delete, comment, role change, decline deletion. | Each arrives once, to the right recipient(s), with the documented text. Tick each trigger off. | |
| NTF-03 | Open the bell / notifications sheet. | Newest first; opening the sheet marks **nothing** read. | |
| NTF-04 | Click one unread notification. | It becomes read immediately (optimistic); still read after reload. | |
| NTF-05 | "Mark all read". | All read in one request (Network tab: one `markAllAsRead`); the dot disappears. | |
| NTF-06 | Delete one notification; then "delete all". | Removed; the list is empty and stays empty after reload. | |
| NTF-07 | Recipient: devtools → Network → **Offline**. Actor triggers 2 events. Back online. | After reconnect the list reloads and shows both. | |
| NTF-08 | Stop the worker (`docker compose stop worker`). Trigger an event. Wait. Start the worker. | Nothing arrives while it's stopped; on start the queued job is delivered (toast + list). | |
| NTF-09 | Stop Redis. Trigger an event. | The mutation still succeeds (it may take up to ~3 s: S-6). The notification is saved to MongoDB and appears after reload. *(Live push needs Redis PubSub, so no toast.)* Restart Redis afterwards. | |
| NTF-10 | Sign out U-1, sign in as U-2 in the same tab. | U-2 sees only U-2's notifications; no U-1 toasts arrive (the socket was reopened with U-2's token). | |
| NTF-11 | Leave the app idle on one page for 10 min, watching the Network tab. | No request loop; at most one safety poll every 5 min. | |
| NTF-12 | API: `notification(id:<someone else's>)`, `markAsRead(<someone else's>)`. | `FORBIDDEN` "You do not have access to this notification". | |

### 4.10 Dashboards & analytics — DSH

| ID | Role | Steps | Expected | Result |
|---|---|---|---|---|
| DSH-01 | SA | Open Dashboard. | Admin dashboard: quick actions **Invite user**, **New project**; stat cards (users, clients, active projects, overdue tasks, resolved…). | |
| DSH-02 | SA | "Needs a decision" strip. | Lists pending deletion requests (Approve / Decline) and clients without an admin (Assign admin). Hidden when there are none. | |
| DSH-03 | CA-A | Open Dashboard. | Quick actions **New task**, **New project**; project progress list (not the donut); no "Needs a decision" strip; figures cover Client A only. | |
| DSH-04 | SA / CA-A | Click each stat card. | Opens the matching page, already filtered. | |
| DSH-05 | SA | Switch range 7d → 30d → 90d; reload. | The "created vs resolved" chart and resolved count change; the chosen range is remembered after reload. | |
| DSH-06 | SA | Compare figures with the data: count overdue tasks, resolved in range, active projects by hand. | They match. | |
| DSH-07 | U-1 | Open Dashboard. | Member dashboard: "Needs attention" tabs Overdue / Today / This week with own tasks only; one-click resolve works; "Your projects" with progress; "My week". | |
| DSH-08 | U-1 | Resolve a task from "Needs attention". | It leaves the list; progress bars update. | |
| DSH-09 | SA / CA-A | Open Analytics. | Stat cards, project-status and user-role donuts, client health, largest teams. Clicking through opens filtered pages. *(Not restyled; dark mode may look off: F-4.)* | |
| DSH-10 | any | New account with no data (U-NEW). | Empty states, not errors or `NaN`. | |

### 4.11 Account & preferences — ACC

| ID | Role | Steps | Expected | Result |
|---|---|---|---|---|
| ACC-01 | any | Account → edit name, phone, DOB, gender. | Saved; the sidebar name updates; persists after reload. | |
| ACC-02 | any | Account menu (sidebar avatar) → edit profile. | Same result as ACC-01. | |
| ACC-03 | any | Toggle theme in the header; reload; sign in on another browser. | Theme switches instantly with no flash on reload. The server preference (`theme`) is saved. | |
| ACC-04 | any | Change language preference. | Saved and returned by `preference` after reload. | |

### 4.12 Security / API — SEC

| ID | Steps | Expected | Result |
|---|---|---|---|
| SEC-01 | API: `query { profile { id } }` with **no** Authorization header. | HTTP **401**, `UNAUTHORIZED`. | |
| SEC-02 | API: login **without** an operation name: `mutation { login(...) {token} }`. | 401: only operations named exactly `LoginMutation`, `RegisterMutation`, `ForgotPasswordMutation`, `ResetPasswordMutation` are public. | |
| SEC-03 | API: name a protected query `LoginMutation` (e.g. `query LoginMutation { users { id } }`) without a token. | No data returned, ideally as `UNAUTHORIZED`. *Read in code, not yet run:* the JWT check trusts the operation **name**, so the resolver runs with `user: null` and likely fails with an internal error (`Cannot read properties of null`). If so, log it as a bug. | |
| SEC-04 | API: a JWT signed with another secret / an expired JWT. | 401. | |
| SEC-05 | U-1 API sweep: `clients`, `users`, `createUser`, `addClient`, `addProject`, `createTask`, `deleteTask`, `assignAdmin`, `promoteToAdmin`, `unlockUsers`, `changeUserRoles`. | Every one `FORBIDDEN`; nothing changes in the DB. | |
| SEC-06 | CA-A API sweep on Client B's objects: `client`, `updateClient`, `updateProject(B1)`, `addUserToProject(B1)`, `createTask(projectId:B1)`, `taskComments(TB)`. | All `FORBIDDEN`. (`tasks`/`task` on B1/TB currently succeed: S-2, see TSK-18.) | |
| SEC-07 | API: any id argument set to `"abc"`. | `VALIDATION_ERROR` before any DB call. | |
| SEC-08 | API: a query nested 8+ levels deep (e.g. `projects { client { assignedAdmin { … } } }` repeated). | Rejected by the depth limit (max 7). | |
| SEC-09 | API (dev): introspection query. Then with `NODE_ENV=production`. | Dev: works. Prod: refused. | |
| SEC-10 | WebSocket: connect to `ws://localhost:8000/graphql` with a bad token (e.g. change `localStorage.token`, reload). | Socket closes with code **4403**; the client does not keep reconnecting. | |
| SEC-11 | Dev only: send the same operation > 100 times in a minute from one IP. | Refused with a too-many-requests error, and the UI shows the message. *(Prod relies on AWS infra instead.)* | |
| SEC-12 | Check the API response for `users`/`user`/`profile`. | No `password`, `resetToken` or hash fields are exposed. | |
| SEC-13 | Put `<img src=x onerror=alert(1)>` into a task title, a comment and a client name. | Rendered as text; no alert. | |

### 4.13 Operations — OPS

| ID | Steps | Expected | Result |
|---|---|---|---|
| OPS-01 | `curl localhost:8000/health/live` | 200. | |
| OPS-02 | `curl localhost:8000/health/ready` with everything up; then with Redis stopped; then with MongoDB unreachable. | 200; 200 (Redis reported down but optional); **503**. | |
| OPS-03 | `curl localhost:9090/metrics`, run a few operations, curl again. | `graphql_requests_total{operation,status}` and `graphql_request_duration_ms` increase; `cache_operations_total` shows hits/misses. Unauthenticated calls count as `status="unauthenticated"`. | |
| OPS-04 | Grafana `localhost:3001` → "ProjoMan API" dashboard. | Loads with live panels; Prometheus `localhost:9091` → Alerts shows the rules from `alerts.yml`. | |
| OPS-05 | Watch the API logs while signing in (success + failure) and resetting a password. | Audit lines `LOGIN`, `LOGIN_FAILED`, `PASSWORD_RESET_REQUESTED`, `PASSWORD_RESET` with `audit: true` and `userId`. No password or token values (redacted). | |
| OPS-06 | Send an operation named `bad name!` (not `/^\w{1,64}$/`). | Logged and counted under operation `"unknown"`. | |
| OPS-07 | Prod-like run (`npm run start` with `.env.prod` pointed at a test DB): kill one cluster worker process. | The primary re-forks it; the API keeps answering. | |
| OPS-08 | `npm run db:indexes -- --dry-run` | Lists the index changes without applying them. | |
| OPS-09 | Restart the API while the frontend is open. | The WebSocket reconnects with back-off and the notification list refreshes; no blank screen. | |

---

## 5. Regression Smoke Checklist

A ~15-minute pass after any change. All IDs refer to §4.

| # | Case | Covers |
|---|---|---|
| 1 | AUTH-05, AUTH-06 | Sign-in works and errors don't leak |
| 2 | AUTH-15 | Sign-out clears the session |
| 3 | NAV-03 – NAV-07 | Nav and role guards |
| 4 | USR-02 | Invite flow |
| 5 | CLI-10, CLI-11 | Deletion request / decline |
| 6 | PRJ-05 | Project visibility per role |
| 7 | PRJ-09 | Team change + notification |
| 8 | TSK-01 | Create + assign task |
| 9 | TSK-06, TSK-08 | Board drag + resolve |
| 10 | SUB-02 | Sub-task quick add |
| 11 | CMT-01, CMT-09 | Comment + outsider blocked |
| 12 | NTF-01, NTF-05 | Live notification + mark all read |
| 13 | DSH-01, DSH-07 | Both dashboards render with real numbers |
| 14 | SEC-01, SEC-05 | Auth required; USER can't call admin mutations |
| 15 | OPS-02 | Readiness probe |

---

## 6. Known Issues to Expect

These are documented limitations. A case that hits one is a **known fail**: record it, but don't file a new bug.

| Issue | Where it shows up | Source |
|---|---|---|
| S-1: `CLIENT_ADMIN` `updateClient` saves every field (incl. `assignedAdmin`, `deleteRequest`) | CLI-17 | `server/STATUS.md` |
| S-2: `tasks` / `task` / `subTasks` / `subTask` don't scope `CLIENT_ADMIN` to their client | TSK-18, SEC-06 | `server/STATUS.md` |
| S-3: SA user lists can be up to 5 min stale after `register`, `deleteUser`, `promoteToAdmin` (cache) | USR-01, USR-17, USR-21: if a change doesn't show, wait or flush Redis before failing the case | `server/STATUS.md` |
| S-4: rare duplicate notification after a Redis timeout | NTF-09 | `server/STATUS.md` |
| S-6: notifying mutations take up to 3 s while Redis is down | NTF-09 | `server/STATUS.md` |
| F-2: `npm run build` fails on 35 legacy `tsc` errors (`vite build` works) | Setup | `frontend/STATUS.md` |
| F-4: Account, Analytics and auth screens not restyled / dark mode off | ACC-*, DSH-09 | `frontend/STATUS.md` |
| F-6: invite link shows "reset password" wording | USR-03 | `frontend/STATUS.md` |
| F-7: no live task updates between users | TSK-21 | `frontend/STATUS.md` |
| F-8: no error boundary; a render error blanks the screen | any; report the screen and console error | `frontend/STATUS.md` |
| F-9: some tables not adapted to phone width | NAV-13 | `frontend/STATUS.md` |

---

## Appendix — API Operation Coverage

Every operation in `server/graphql/schema.js` and the cases that exercise it. When an operation is added, add a case and a row here.

| Area | Operation → cases |
|---|---|
| Auth | `register` AUTH-01–04 · `login` AUTH-05–07, SEC-02 · `forgotPassword` AUTH-09, AUTH-13 · `resetPassword` AUTH-10–12, USR-03 · `changePassword` AUTH-14 · `profile` SEC-01 · `updateProfile` ACC-01–02 |
| Users | `users` USR-01, USR-22–23 · `user` USR-23 · `createUser` USR-02–08 · `updateUser` USR-09 · `resendInvite` USR-10–11 · `changeUserRoles` USR-12–14 · `unlockUsers` AUTH-08 · `deleteUser` USR-17–20 · `deleteUsers` USR-19 · `promoteToAdmin` USR-21 |
| Clients | `clients` CLI-01, CLI-16 · `client` CLI-09 · `addClient` CLI-01–03 · `updateClient` CLI-04, CLI-17 · `assignAdmin` CLI-05–07 · `confirmDeleteClient` CLI-10, CLI-14 · `declineClientDeletion` CLI-11–12 · `deleteClientBySuperAdmin` CLI-13–14 · `forceDeleteClient` CLI-15 |
| Projects | `projects` PRJ-05 · `project` PRJ-06, PRJ-13 · `addProject` PRJ-01–04 · `updateProject` PRJ-08, PRJ-15 · `deleteProject` PRJ-14 · `addUserToProject` PRJ-09–10 · `removeUserFromProject` PRJ-11–12 |
| Tasks | `tasks` TSK-17–18 · `task` TSK-17, TSK-20 · `allTasks` TSK-03–05, TSK-17 · `createTask` TSK-01–02, TSK-19 · `updateTask` TSK-10–12 · `updateTaskStatus` TSK-06–09 · `deleteTask` TSK-14–16 |
| Sub-tasks | `subTasks` SUB-09 · `subTask` SUB-09 · `createSubTask` SUB-01–03 · `updateSubTask` SUB-05, SUB-08 · `updateSubTaskStatus` SUB-04–05 · `deleteSubTask` SUB-06–08 |
| Comments | `taskComments` CMT-01, CMT-09 · `subTaskComments` CMT-03 · `addTaskComment` CMT-01–02 · `addSubTaskComment` CMT-03 · `updateComment` CMT-05–06, CMT-12 · `deleteComment` CMT-07–08, CMT-11 |
| Notifications | `notifications` NTF-03 · `notification` NTF-12 · `markAsRead` NTF-04, NTF-12 · `markAllAsRead` NTF-05 · `markNotificationsRead` NTF-05 (bulk path, if the UI uses it) · `deleteNotification` / `deleteAllNotifications` NTF-06 · `notificationCreated` (subscription) NTF-01–02, NTF-10, SEC-10 |
| Preferences | `preference` / `updatePreference` ACC-03–04 |
