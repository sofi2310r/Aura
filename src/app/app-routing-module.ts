import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { Foro } from './pages/foro/foro';

const routes: Routes = [
  { path: '', component: Home },
  { path: 'foro', component: Foro },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
