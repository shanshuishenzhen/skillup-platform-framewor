# API and Data Model Documentation

This document provides a detailed overview of the database models and API endpoints for the Simple OA System.

## Database Models

### 1. User Model

Represents a user in the system.

| Field       | Type     | Constraints              | Description                            |
|-------------|----------|--------------------------|----------------------------------------|
| `username`  | String   | Required, Unique, Trimmed| The user's login name.                 |
| `password`  | String   | Required                 | The user's hashed password.            |
| `createdAt` | Date     | Default: `Date.now`      | Timestamp of when the user was created.|

### 2. Project Model

Represents a project created by a user.

| Field         | Type     | Constraints              | Description                                     |
|---------------|----------|--------------------------|-------------------------------------------------|
| `name`        | String   | Required, Trimmed        | The name of the project.                        |
| `description` | String   | Optional                 | A brief description of the project.             |
| `owner`       | ObjectId | Required, Ref: 'User'    | The ID of the user who owns the project.        |
| `createdAt`   | Date     | Default: `Date.now`      | Timestamp of when the project was created.      |

### 3. Task Model

Represents a task within a project.

| Field        | Type     | Constraints                      | Description                                     |
|--------------|----------|----------------------------------|-------------------------------------------------|
| `title`      | String   | Required, Trimmed                | The title of the task.                          |
| `project`    | ObjectId | Required, Ref: 'Project'         | The ID of the project this task belongs to.     |
| `status`     | String   | Enum: `['To Do', 'In Progress', 'Done']`, Default: `'To Do'` | The current status of the task.                 |
| `assignedTo` | ObjectId | Optional, Ref: 'User'            | The ID of the user this task is assigned to.    |
| `createdAt`  | Date     | Default: `Date.now`              | Timestamp of when the task was created.         |

---

## API Endpoints

All endpoints requiring authentication must include the JWT in the `x-auth-token` header.

### Authentication (`/api/auth`)

| Method | Endpoint      | Access  | Description                               |
|--------|---------------|---------|-------------------------------------------|
| `POST` | `/register`   | Public  | Registers a new user.                     |
| `POST` | `/login`      | Public  | Logs in a user and returns a JWT.         |
| `GET`  | `/`           | Private | Gets the currently authenticated user's data. |

### Projects (`/api/projects`)

| Method   | Endpoint          | Access  | Description                               |
|----------|-------------------|---------|-------------------------------------------|
| `POST`   | `/`               | Private | Creates a new project.                    |
| `GET`    | `/`               | Private | Gets all projects for the logged-in user. |
| `GET`    | `/:id`            | Private | Gets a single project by its ID.          |
| `PUT`    | `/:id`            | Private | Updates a project.                        |
| `DELETE` | `/:id`            | Private | Deletes a project and its associated tasks. |
| `POST`   | `/:id/tasks`      | Private | Creates a new task for a specific project.|
| `GET`    | `/:id/tasks`      | Private | Gets all tasks for a specific project.    |

### Tasks (`/api/tasks`)

| Method   | Endpoint | Access  | Description       |
|----------|----------|---------|-------------------|
| `PUT`    | `/:id`   | Private | Updates a task.   |
| `DELETE` | `/:id`   | Private | Deletes a task.   |
