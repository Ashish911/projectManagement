// import { gql } from "@apollo/client";

export const LOGIN = `
  mutation login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      token
    }
  }
`;

export const REGISTER = `
  mutation register(
    $name: String!
    $email: String!
    $number: String!
    $dob: String!
    $password: String!
    $role: String!
    $gender: String!
  ) {
    register(
      name: $name
      email: $email
      number: $number
      dob: $dob
      password: $password
      role: $role
      gender: $gender
    ) {
      name
    }
  }
`;
