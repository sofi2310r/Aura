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

## Frameworks

-Angular
-Flutter

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

## Caracteristicas

AURA es una plataforma web y móvil dirigida a mujeres, diseñada para brindar un espacio seguro de apoyo, orientación e información frente a situaciones como violencia de género, salud emocional, apoyo comunitario y acceso a redes de ayuda. El proyecto busca fortalecer el bienestar y la seguridad de las usuarias mediante una comunidad digital donde puedan encontrar acompañamiento, compartir experiencias y acceder a recursos confiables.
Entre sus principales características se encuentran un sistema de registro e inicio de sesión, un foro comunitario moderado, acceso a información sobre rutas y redes de apoyo, chat con psicólogos, paneles administrativos para moderadores, psicólogos y administradores, además de un asistente con inteligencia artificial que brindará orientación automática y responderá preguntas basadas en la información disponible en la plataforma. El sistema será desarrollado para web y móvil utilizando Angular, Flutter, Node.js y Firebase, priorizando la seguridad, accesibilidad y facilidad de uso.

##  Integrantes

Greylin Vanessa Martinez
Brayan Alexander Mosos
Evelin Baron