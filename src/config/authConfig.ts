import "dotenv/config";

const authConfig = {
  secret: process.env.JWT_SECRET,
  expiresIn: "7d",
};

export default authConfig;
