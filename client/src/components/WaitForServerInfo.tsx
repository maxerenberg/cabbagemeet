import React from "react";
import { useGetServerInfoQuery } from "slices/api";
import { getReqErrorMessage } from "utils/requests.utils";
import GenericSpinner from "./GenericSpinner";

export default function WaitForServerInfo({children}: React.PropsWithChildren<{}>) {
  const {isLoading, error} = useGetServerInfoQuery();
  if (isLoading) {
    return <GenericSpinner />;
  }
  if (error) {
    return (
      <p>
        An error occurred while fetching the server info: {getReqErrorMessage(error)}
      </p>
    );
  }
  return <>{children}</>;
}
