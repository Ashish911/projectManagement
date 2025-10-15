export const LOGIN = `
  mutation LoginMutation($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      token
    }
  }
`;

export const REGISTER = `
  mutation RegisterMutation(
    $name: String!
    $email: String!
    $number: String!
    $dob: String!
    $password: String!
    $gender: Gender!
  ) {
    register(
      name: $name
      email: $email
      number: $number
      dob: $dob
      password: $password
      gender: $gender
    ) {
      name
    }
  }
`;
