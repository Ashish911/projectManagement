import { useMutation } from "react-query";
import { AxiosResponse } from "axios";
import { loginUser, registerUser } from "../api/authApi";

export const useLogin = () => {
  return useMutation((credentials: Login) => loginUser(credentials));
};

export const useRegister = () => {
  return useMutation((userData: Register) => registerUser(userData));
};
