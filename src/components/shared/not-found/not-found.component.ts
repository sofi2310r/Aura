import { Component, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-not-found',
  standalone: false,
  templateUrl: './not-found.component.html',
  styleUrls: ['./not-found.component.css']
})
export class NotFoundComponent implements OnInit {
  public currentUrl = '';
  public authError = '';
  public redirectMessage = '';

  constructor(
    private location: Location,
    private router: Router,
    private route: ActivatedRoute,
  ) {
    this.currentUrl = location.path() || '/';
  }

  ngOnInit(): void {
    const query = this.route.snapshot.queryParamMap;
    this.authError = query.get('authError') || '';
    const redirectToLogin = query.get('redirectToLogin');

    if (redirectToLogin === 'true') {
      this.redirectMessage = 'Serás redirigido al login en 3 segundos...';
      setTimeout(() => {
        this.router.navigate(['/login']);
      }, 3000);
    }
  }
}
