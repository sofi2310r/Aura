import { Injectable } from '@angular/core';
import { Firestore, collection, addDoc, collectionData, doc, updateDoc, arrayUnion, Timestamp } from '@angular/fire/firestore'; 
import { Observable } from 'rxjs';

export interface Publicacion{
  id?: string;
  titulo: string;
  contenido: string;
  anonima: boolean;
  autor: string;
  fecha: any;
  comentarios: Comentario[];
}

export interface Comentario{
  texto: string;
  autor: string;
  anonimo: boolean;
  fecha: any;
  reportado: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class Foro {
  constructor(private firestore: Firestore){}

  getPublicaciones(): Observable<Publicacion[]> {
    const ref = collection(this.firestore, 'publicaciones');
    return collectionData(ref, { idField: 'id' }) as Observable<Publicacion[]>;
  }

  agregarPublicacion(pub: Publicacion) {
    const ref = collection(this.firestore, 'publicaciones');
    return addDoc(ref, { ...pub, fecha: Timestamp.now(), comentarios: [] });
  }

  agregarComentario(pubId: string, comentario: Comentario) {
    const ref = doc(this.firestore, 'publicaciones', pubId);
    return updateDoc(ref, {
      comentarios: arrayUnion({ ...comentario, fecha: Timestamp.now(), reportado: false})
    });
  }

  reportarComentario(pubId: string, comentarios: Comentario[]) {
    const ref = doc(this.firestore, 'publicaciones', pubId);
    return updateDoc(ref, { comentarios });
  }
}
