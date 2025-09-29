
interface GraphqlResponse<T> {
    data: T;
    errors?: { message: string }[];
    status: string;
    statusText: string;
}