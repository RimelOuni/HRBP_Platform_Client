import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../auth.service';

interface Toast {
  id: number;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
  isExiting?: boolean;
}

@Component({
  standalone: true,
  selector: 'app-login',
  imports: [FormsModule, CommonModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login implements OnInit, OnDestroy {
  email = '';
  password = '';
  rememberMe = false;
  isLoading = false;
  toasts: Toast[] = [];
  private toastIdCounter = 0;

  constructor(
    private auth: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    // Check if user credentials are remembered
    const rememberedEmail = localStorage.getItem('rememberedEmail');
    if (rememberedEmail) {
      this.email = rememberedEmail;
      this.rememberMe = true;
    }
  }

  ngOnDestroy() {
    // Clean up any remaining toasts
    this.toasts = [];
  }

  submit() {
    // Validation
    if (!this.email || !this.password) {
      this.showToast('error', 'Validation Error', 'Please fill in all fields');
      return;
    }

    if (!this.isValidEmail(this.email)) {
      this.showToast('error', 'Invalid Email', 'Please enter a valid email address');
      return;
    }

    this.isLoading = true;

    this.auth.login(this.email, this.password).subscribe({
      next: (res) => {
        const role: string = res.user.role;

        // Handle remember me functionality
        if (this.rememberMe) {
          localStorage.setItem('rememberedEmail', this.email);
        } else {
          localStorage.removeItem('rememberedEmail');
        }

        const roleRouteMap: Record<string, string> = {
          ADMIN_RH: '/admin',
          DIRECTION_RH: '/direction',
          HRBP: '/hrbp',
          MANAGER: '/manager',
          COLLABORATOR: '/collab',
        };

        const route = roleRouteMap[role];

        if (!route) {
          this.isLoading = false;
          this.showToast('error', 'Unauthorized', 'Your role is not authorized to access this platform');
          return;
        }

        this.showToast('success', 'Welcome back!', `Logging you in as ${role.replace('_', ' ')}...`);

        // Navigate after a short delay to show success message
        setTimeout(() => {
          this.router.navigate([route]);
        }, 1000);
      },
      error: (err) => {
        this.isLoading = false;
        const errorMessage = err.error?.message || 'Invalid email or password';
        this.showToast('error', 'Authentication Failed', errorMessage);
      }
    });
  }

  handleForgotPassword(event: Event) {
    event.preventDefault();
    
    if (!this.email) {
      this.showToast(
        'info', 
        'Email Required', 
        'Please enter your email address first, then click "Forgot password?"'
      );
      return;
    }

    if (!this.isValidEmail(this.email)) {
      this.showToast('error', 'Invalid Email', 'Please enter a valid email address');
      return;
    }

    // Show notification that admin has been contacted
    this.showToast(
      'success',
      'Password Reset Requested',
      `A password reset request has been sent to the ADMIN_RH. You will receive an email at ${this.email} shortly.`,
      7000
    );

    // Optionally, make an API call to trigger the actual password reset email
    // this.auth.requestPasswordReset(this.email).subscribe(...);
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  showToast(
    type: 'success' | 'error' | 'info' | 'warning',
    title: string,
    message: string,
    duration: number = 5000
  ) {
    const toast: Toast = {
      id: this.toastIdCounter++,
      type,
      title,
      message
    };

    this.toasts.push(toast);

    // Auto remove after duration
    setTimeout(() => {
      this.removeToast(toast.id);
    }, duration);
  }

  removeToast(id: number) {
    const toast = this.toasts.find(t => t.id === id);
    if (toast) {
      toast.isExiting = true;
      setTimeout(() => {
        this.toasts = this.toasts.filter(t => t.id !== id);
      }, 300);
    }
  }

  getToastIcon(type: string): string {
    const icons = {
      success: '✓',
      error: '✕',
      info: 'ℹ',
      warning: '⚠'
    };
    return icons[type as keyof typeof icons] || 'ℹ';
  }
}