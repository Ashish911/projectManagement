// import { useState } from 'react';

// export function useInputMap(formType: String, inputObj: Object, inputSetObj: Object) {
//     const [inputMap, setInputMap] = useState([]);

//     const setInputFields = () => {
//         switch (formType) {
//           case 'register':
//             setInputMap([
//               {
//                 type: 'email',
//                 name: 'email',
//                 placeholder: 'name@example.com',
//                 value: inputObj.email,
//                 onChange: inputSetObj.setEmail
//               },
//               {
//                 type: 'text',
//                 name: 'name',
//                 placeholder: 'John Doe',
//                 value: inputObj.name,
//                 onChange: inputSetObj.setName
//               },
//               {
//                 type: 'string',
//                 name: 'phoneNumber',
//                 placeholder: '+977 ......',
//                 value: inputObj.phoneNumber,
//                 onChange: inputSetObj.setPhoneNumber
//               },
//               {
//                 type: 'password',
//                 name: 'password',
//                 placeholder: 'Password',
//                 value: inputObj.password,
//                 onChange: inputSetObj.setPassword
//               },
//               {
//                 type: 'password',
//                 name: 'confirmPassword',
//                 placeholder: 'Password',
//                 value: inputObj.confirmPassword,
//                 onChange: inputSetObj.setConfirmPassword
//               },
//               {
//                 type: 'select',
//                 name: 'gender',
//                 value: inputObj.gender,
//                 onChange: inputSetObj.setGender
//               }, {
//                 type: 'date',
//                 name: 'dateOfBirth',
//                 value: inputObj.dob,
//                 onChange: inputSetObj.setDob
//               }
//             ]);
//             break;
//           case 'login':
//             setInputMap([
//               {
//                 type: 'email',
//                 name: 'email',
//                 placeholder: 'name@example.com',
//               },
//               {
//                 type: 'password',
//                 name: 'password',
//                 placeholder: 'Password',
//               },
//             ]);
//             break;
//           default:
//             setInputMap([]);
//         }
//       };

//     return {
//     inputMap,
//     setInputFields,
//     };
// }

import { useState } from "react";

export interface InputConfig {
  name: string;
}

const placeholderConstant = {
  email: "name@example.com",
  name: "John Doe",
  phoneNumber: "+977 ......",
  password: "Password",
  confirmPassword: "Confirm Password",
  gender: "",
  dateOfBirth: "",
};

const typeConstant = {
  email: "email",
  name: "text",
  phoneNumber: "text",
  password: "password",
  confirmPassword: "password",
  gender: "select",
  dateOfBirth: "date",
};

export function useInputMap(inputConfigs: Array<String>) {
  const inputMap = inputConfigs.map((config: String) => {
    const [value, setValue] = useState<string>("");
    const onChange = (newValue: string) => setValue(newValue);

    return {
      name: config,
      placeholder: placeholderConstant[config],
      type: typeConstant[config],
      value,
      onChange,
    };
  });

  return inputMap;
}
