import axios, {AxiosResponse} from "axios";
import {PROFILE} from "@/queries/userQueries.ts";

const BASE_URL = "http://localhost:8000/graphql";

const api = axios.create({
    baseURL: BASE_URL,
    headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
    },
});

export const getProfile = async () : Promise<ProfileResponse> => {
    try {
        api.interceptors.request.use((config) => {
            const token = localStorage.getItem("token");
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
            return config;
        });

        const token = localStorage.getItem("token");

        console.log(token)

        console.log(api)

        const response : AxiosResponse<GraphqlResponse<ProfileResponse>> = await api.post("", {
            query: PROFILE,
        });



        if (response.data.errors) {
            throw new Error(response.data.errors[0].message);
        }

        return response.data.data;
    } catch (err) {
        console.error(err);
        throw new Error("Failed to fetch profile");
    }
};