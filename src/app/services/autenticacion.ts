import { Injectable } from "@angular/core";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";

@Injectable({
    providedIn: 'root'
})
export class AutenticacionService {
    iniciarSesion(email: string, password: string): Promise<any> {
        const auth = getAuth();
        return signInWithEmailAndPassword(auth, email, password);
    }
}