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
        const role = res.user.role;

        if (role === 'ADMIN_RH') {
          this.router.navigate(['/admin']);
        } else if (role === 'DIRECTION_RH') {
          this.router.navigate(['/direction']);
        } else {
          this.router.navigate(['/profile']);
        }
      },
      error: (err) => {
        this.error = err.error?.message || 'Invalid credentials';
      }
    });
  }
}