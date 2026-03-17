import { Component } from '@angular/core';
import { Observable } from 'rxjs';
import { User } from '../../../models/user.model';
import { UserService } from '../../../services/user.service';

@Component({
  selector: 'app-pacientes',
  standalone: false,
  templateUrl: './pacientes.component.html',
  styleUrl: './pacientes.component.css',
})
export class PacientesComponent {
  readonly pacientes$: Observable<User[]>;

  constructor(private readonly userService: UserService) {
    this.pacientes$ = this.userService.getUsersByRole('paciente');
  }
}