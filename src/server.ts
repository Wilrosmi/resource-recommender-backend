import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { Client } from "pg";

interface INewDBItem {
  title: string;
  link: string;
  type: string;
  message?: string;
}

const app = express();

/** Parses JSON data in a request automatically */
app.use(express.json());
/** To allow 'Cross-Origin Resource Sharing': https://en.wikipedia.org/wiki/Cross-origin_resource_sharing */
app.use(cors());

// read in contents of any environment variables in the .env file
dotenv.config();

// use the environment variable PORT, or 4000 as a fallback
const PORT_NUMBER = process.env.PORT ?? 4000;

// Serve all items in db
app.get("/rec", async (req, res): Promise<void> => {
  const client = new Client({ database: "recResourcesDB" });
  await client.connect();
  const responseData = (await client.query("SELECT * FROM recommendations;"))
    .rows;
  res.status(200).json({
    status: "success",
    data: responseData,
  });
  await client.end();
});

// Serve a particular item in db
app.get<{ id: string }>("/rec/:id", async (req, res): Promise<void> => {
  const client = new Client({ database: "recResourcesDB" });
  await client.connect();
  const id = parseInt(req.params.id);
  const responseData = (
    await client.query("SELECT * FROM recommendations WHERE id = $1;", [id])
  ).rows[0];
  if (responseData) {
    res.status(200).json({
      status: "success",
      data: responseData,
    });
  } else {
    res.status(404).json({
      status: "failure",
      data: "no item with that id",
    });
  }
  await client.end();
});

// Create a new item in the db
app.post<{}, {}, INewDBItem>("/rec", async (req, res): Promise<void> => {
  const client = new Client({ database: "recResourcesDB" });
  await client.connect();
  const { title, type, link, message } = req.body;
  console.log(typeof title, typeof type, typeof link, typeof message);
  const linkUniquenesCheck = (
    await client.query("SELECT * FROM recommendations WHERE link = $1", [link])
  ).rowCount;
  if (linkUniquenesCheck > 0) {
    res.status(400).json({
      status: "failure",
      data: "that link is already taken in the database",
    });
  } else if (
    typeof title === "string" &&
    typeof type === "string" &&
    typeof link === "string" &&
    (typeof message === "string" || message === undefined)
  ) {
    const values = [title, type, link, message];
    const responseData = await client.query(
      "INSERT INTO recommendations (title, type, link, message) VALUES ($1, $2, $3, $4);",
      values
    );
    res.status(201).json({
      status: "succes",
      data: responseData.rowCount,
    });
  } else {
    res.status(400).json({
      status: "failure",
      data: "invalid input",
    });
  }
  await client.end();
});

//Deletes an item from the database based on id
app.delete<{ id: string }>("/rec/:id", async (req, res): Promise<void> => {
  const client = new Client({ database: "recResourcesDB" });
  await client.connect();
  const id = parseInt(req.params.id);
  const responseData = await client.query(
    "DELETE FROM recommendations WHERE id = $1",
    [id]
  );
  if (responseData.rowCount > 0) {
    res.status(200).json({ status: "success", data: responseData.rowCount });
  } else {
    res.status(404).json({ status: "failure", data: "no element of that id" });
  }
  await client.end();
});

app.put<{ id: string }, {}, INewDBItem>(
  "/rec/:id",
  async (req, res): Promise<void> => {
    const client = new Client({ database: "recResourcesDB" });
    await client.connect();
    const id = parseInt(req.params.id);
    const { title, type, link, message } = req.body;
    const linkUniquenesCheck = await client.query(
      "SELECT * FROM recommendations WHERE link = $1",
      [link]
    );
    if (
      linkUniquenesCheck.rowCount > 0 &&
      linkUniquenesCheck.rows[0].id !== id
    ) {
      res.status(400).json({
        status: "failure",
        data: "that link is already taken in the database",
      });
    } else {
      if (
        !(
          typeof title === "string" &&
          typeof type === "string" &&
          typeof link === "string" &&
          (typeof message === "string" || message === undefined)
        )
      ) {
        res.status(400).json({ status: "failure", data: "invalid input" });
      } else {
        const responseData = await client.query(
          "UPDATE recommendations SET title = $1, link = $2, type = $3, message = $4 WHERE id = $5",
          [title, link, type, message, id]
        );
        if (responseData.rowCount > 0) {
          res
            .status(200)
            .json({ status: "success", data: responseData.rowCount });
        } else {
          res
            .status(404)
            .json({ status: "failure", data: "no item with that id" });
        }
        client.end();
      }
    }
  }
);

app.listen(PORT_NUMBER, () => {
  console.log(`Server is listening on port ${PORT_NUMBER}!`);
});
