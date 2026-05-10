export interface GraphqlResponse<T> {
  data: T;
  errors?: { message: string }[];
}
