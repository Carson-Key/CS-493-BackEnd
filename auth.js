exports.handler = async (event) => {
  console.log("event", JSON.stringify(event, null, 2));

  console.log("event.headers['Authorization']", event.headers["Authorization"]);

  const tokenID = event.headers && event.headers["Authorization"];

  if (!tokenID) {
    console.log("could not find a token on the event");
    return generatePolicy({ allow: false });
  }
  try {
    return generatePolicy({ allow: true });
  } catch (error) {
    console.log("error ", error);
    return generatePolicy({ allow: false });
  }
};

const generatePolicy = ({ allow }) => {
  return {
    principalId: "token",
    policyDocument: {
      Version: "2012-10-17",
      Statement: {
        Action: "execute-api:Invoke",
        Effect: allow ? "Allow" : "Deny",
        Resource: "*",
      },
    },
  };
};