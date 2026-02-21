import { NextPageContext } from "next";

type ErrorProps = {
  statusCode?: number;
};

function Error({ statusCode }: ErrorProps) {
  return (
    <div style={{ 
      display: "flex", 
      flexDirection: "column", 
      alignItems: "center", 
      justifyContent: "center", 
      minHeight: "100vh",
      background: "#0a0f1a",
      color: "white",
      fontFamily: "system-ui, sans-serif"
    }}>
      <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>
        {statusCode ? `Error ${statusCode}` : "An error occurred"}
      </h1>
      <p style={{ color: "#94a3b8" }}>
        {statusCode === 404 
          ? "This page could not be found." 
          : "Something went wrong."}
      </p>
      <a 
        href="/" 
        style={{ 
          marginTop: "1.5rem", 
          padding: "0.5rem 1.5rem", 
          background: "#10b981", 
          color: "white", 
          borderRadius: "9999px", 
          textDecoration: "none" 
        }}
      >
        Go Home
      </a>
    </div>
  );
}

Error.getInitialProps = ({ res, err }: NextPageContext) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
  return { statusCode };
};

export default Error;
