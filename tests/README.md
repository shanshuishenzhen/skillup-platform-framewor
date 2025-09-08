# End-to-End Tests (E2E)

This directory contains the end-to-end tests for the SkillUp application, written using [Playwright](https://playwright.dev/). These tests simulate real user interactions in a browser to verify that the application's key features are working correctly.

## Setup

1.  **Install Dependencies**: Before running the tests, ensure all project dependencies, including the testing framework, are installed. From the project root, run:
    ```bash
    npm install
    ```

2.  **Install Playwright Browsers**: Playwright requires browser binaries to run tests. After `npm install`, you may need to run the following command once:
    ```bash
    npx playwright install
    ```

## Running the Tests

1.  **Start the Application**: These tests are designed to run against a running instance of the application. First, start the development server in one terminal window:
    ```bash
    npm run dev
    ```
    *Note: The test runner can also start the server automatically if the `webServer` option in `playwright.config.ts` is active.*

2.  **Run the Test Suite**: Once the application is running at `http://localhost:3000`, open a second terminal window and run the following command from the project root:
    ```bash
    npx playwright test
    ```

3.  **View the Test Report**: After the test run is complete, a detailed HTML report will be generated. You can view it by running:
    ```bash
    npx playwright show-report
    ```

## Test Scripts

### `tests/auth.spec.ts`

This file contains tests for the user authentication and registration flows:
-   **User Registration**: Verifies that a new user can successfully register.
-   **Standard Login**: Verifies that a registered user can log in and is redirected to the homepage.
-   **Failed Login**: Verifies that an appropriate error message is shown when incorrect credentials are used.
-   **Paid User Login**: Verifies that a user designated as "paid" is prompted with the face scan modal after logging in.
