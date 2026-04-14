import { Component } from '@angular/core';
import { Router } from '@angular/router';
@Component({
  selector: 'app-quienes-somos',
  standalone: false,
  templateUrl: './quienes-somos.html',
  styleUrl: './quienes-somos.css',
})
export class QuienesSomos {

  constructor(private router: Router) {}

irHome() {
  this.router.navigate(['/home']);
}
}
