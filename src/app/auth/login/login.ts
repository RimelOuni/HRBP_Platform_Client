import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../auth.service';

@Component({
  standalone: true,
  selector: 'app-login',
  imports: [FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {
  email = '';
  password = '';
  error = '';
  rememberMe = false;

  constructor(
    private auth: AuthService,
    private router: Router
  ) {}

  submit() {
    this.error = '';

    this.auth.login(this.email, this.password).subscribe({
      next: (res) => {
        const role: string = res.user.role;

        const roleRouteMap: Record<string, string> = {
          ADMIN_RH: '/admin',
          DIRECTION_RH: '/direction',
          HRBP: '/hrbp',
          MANAGER: '/manager',
          COLLABORATOR: '/collab',
        };

        const route = roleRouteMap[role];

        if (!route) {
          this.error = 'Unauthorized role';
          return;
        }

        this.router.navigate([route]);
      },
      error: (err) => {
        this.error = err.error?.message || 'Invalid credentials';
      }
    });
  }
}
