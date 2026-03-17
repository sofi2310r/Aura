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
```bash
ng serve
```

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
