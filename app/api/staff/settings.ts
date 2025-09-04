// import prisma from "../../../lib/prisma";
import { NextApiRequest, NextApiResponse } from "next";

type Response = {
  message: string | object;
  success: boolean;
};

const settings = (req: NextApiRequest, res: NextApiResponse<Response>) => {
  console.log("settings");

  return res.status(200).json({
    success: true,
    message: "settings",
  });
};

export default settings;
