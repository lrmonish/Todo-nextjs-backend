const express = require("express");
const cors = require("cors");
const app = express();
const bcrypt = require("bcrypt");
const { Op } = require("sequelize");
const jwt = require("jsonwebtoken");
const Result = require("folktale/result");

const { Task, User } = require("./models/model");

app.use(express.json());

app.use(cors());

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS"
  );
  next();
});

app.post("/task", async (req, res) => {
  try {
    const { id, name, description, time, status } = req.body;

    const newTask = await Task.create({ id, name, description, time, status });

    res.json({ message: "Task created successfully!", data: newTask });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error creating task" });
  }
});

app.get("/gettask", async (req, res) => {
  try {
    const task = await Task.findAll();
    res.json(task).status(200);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching tasks" });
  }
});

app.delete("/deletetask/:id", async (req, res) => {
  const taskId = req.params.id;

  try {
    const task = await Task.findByPk(taskId);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    await task.destroy();
    return res.status(200).json({ message: "Task deleted" });

    res.status(204).end();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error deleting task" });
  }
});

app.delete("/deleteuser/:id", async (req, res) => {
  const taskId = req.params.id;

  try {
    const task = await User.findByPk(taskId);
    if (!task) {
      return res.status(404).json({ message: "user not found" });
    }

    await task.destroy();
    return res.status(200).json({ message: "user deleted" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error deleting user" });
  }
});

app.put("/updatetask/:id", async (req, res) => {
  const taskId = req.params.id;

  try {
    const task = await Task.findByPk(taskId);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }
    await task.update(req.body);
    return res.status(200).json({ message: "Task Updated" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error updating task" });
  }
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
app.post("/register", async (req, res) => {
  let result = { val: 0, message: "" };

  const { name, email, mobile, gender, country, password, hobbies } = req.body;

  await composeResult(
    async (hashedPassword) =>
      createUser(
        {
          name,
          email,
          mobile,
          gender,
          country,
          password: hashedPassword,
          hobbies,
        },
        result
      ),
    () => generatePassword(result, password),
    () => checkForExistingUser(result, { email, mobile }),
    result
  );
  await respond(result, res);
});

const composeResult = async (...args) => {
  const reverse = args.reverse();
  let r = reverse[0];

  for (let i = 1; i < reverse.length; i++) {
    if (i == 1) {
      r.val = await reverse[i]();
      if (!r.val.getOrElse(null) === true) {
        r.val = undefined;
        break;
      }
    } else {
      r.val = await reverse[i](r.val);
      if (r.val === "Error Hashing Password") {
        r.val = undefined;
        break;
      }

      if (i === reverse.length - 1) {
        break;
      }

      r.val = r.val.merge();
    }
  }
};

const createUser = (user, result) => {
  User.create(user);
  result.message = Result.Ok({ message: "User Created" });
};

const checkForExistingUser = async (result, { email, mobile }) => {
  const existingUser = await User.findOne({
    where: {
      [Op.or]: [{ email }, { mobile }],
    },
  });

  if (existingUser) {
    result.message = Result.Error({
      message: "User with this email or mobile number already exists",
    });
    return result.message;
  } else {
    return Result.Ok(true);
  }
};

const generatePassword = async (result, password) => {
  // const pass = password + "ghjkluirutsehrgshf";
  const pass = await bcrypt.hash(password, 10);

  const regex = /^\$2b\$10\$.{53}$/;

  if (!regex.test(pass)) {
    result.message = "Error Hashing Password";
    return result.message;
  } else {
    return Result.Ok(pass);
  }
};

const respond = (result, res) => {
  result.val = 0;
  if (result.message === "Error Hashing Password") {
    return res.status(400).json({ message: result.message });
  } else {
    let final = result.message.merge();

    if (final.message === "User Created") {
      return res.status(200).json({ message: final.message });
    } else {
      return res.status(400).json({ message: final.message });
    }
  }
};
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
app.post("/login", async (req, res) => {
  const { mobileNumber, password } = req.body;

  try {
    // Find the user
    const user = await User.findOne({ where: { mobile: mobileNumber } });
    if (!user) {
      return res.status(401).json({ message: "Invalid mobile number" });
    }

    // Compare the provided password
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ message: "Invalid password" });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, name: user.name, email: user.email },
      "secretKey",
      { expiresIn: "1h" } // Expiration
    );

    res.setHeader(
      "Authorization",
      `Bearer ${token}`,
      "username",
      `name ${user.name}`
    );
    res.json({ token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.listen(4000, () => {
  console.log("Server listening on port 4000");
});
