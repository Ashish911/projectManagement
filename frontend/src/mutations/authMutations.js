import { gql } from "@apollo/client";

const LOGIN = gql`
  mutation login($email: String!, $password: String!) {
    login(email: $email, phone: $password) {
      token
    }
  }
`;

const REGISTER = gql`
  mutation register(
    $name: String!
    $email: String!
    $phone: String!
    $dob: String!
    $password: String!
    $role: String!
    $gender: String!
  ) {
    register(
      name: $name
      email: $email
      phone: $phone
      dob: $dob
      password: $password
      role: $role
      gender: $gender
    ) {
      name
    }
  }
`;

export { LOGIN, REGISTER };
