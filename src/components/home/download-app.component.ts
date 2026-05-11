import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-download-app',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './download-app.component.html',
  styleUrls: ['./download-app.component.css'],
})
export class DownloadAppComponent {}
