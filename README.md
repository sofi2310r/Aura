<<<<<<< HEAD
# AURA 
## Project Structure

```
AuraWeb/
├── src/                    # Frontend (Angular)
│   ├── components/
│   ├── services/
│   ├── models/
│   └── app/
└── backend/                # Backend (Express.js)
    ├── routes/
    ├── middleware/
    ├── config/
    └── server.js
```

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Firebase account with Firestore configured

## Installation

### 1. Install Frontend Dependencies

```bash
npm install
```

### 2. Install Backend Dependencies

```bash
cd backend
npm install
cd ..
```

## Running the Project

### Option 1: Start Both Frontend and Backend (Recommended)

Open two terminal windows/tabs from the project root:

**Terminal 1 - Frontend (Angular Development Server)**
=======
# Aura

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 20.2.0.

## Development server

To start a local development server, run:

>>>>>>> d89e316e627d09751f793627f31196d069cb7534
```bash
ng serve
```

<<<<<<< HEAD
**Terminal 2 - Backend (Express Server)**
```bash
cd backend
npm start
```


### Option 2: Build and Run Production

**Build Frontend**
```bash
ng build --configuration production
```

**Start Backend with Frontend**
```bash
cd backend
npm start
```


## License

This project AURA
## Support

For issues and support, please contact the development team or open an issue in the project repository.
=======
Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Karma](https://karma-runner.github.io) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
>>>>>>> d89e316e627d09751f793627f31196d069cb7534
