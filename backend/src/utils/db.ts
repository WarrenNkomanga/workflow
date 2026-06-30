import { Pool, type QueryResult, type QueryResultRow } from "pg";

const connectionString =
  "postgresql://postgres:supersecretpassword@localhost:5432/workflow_assessment";

export const pool = new Pool({
  connectionString,
});

export const query = <T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<QueryResult<T>> => {
  return pool.query<T>(text, params);
};
