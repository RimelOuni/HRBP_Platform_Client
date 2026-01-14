import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
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
    private router: Router,
    private cdr: ChangeDetectorRef
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
    console.log('Starting login process, isLoading:', this.isLoading);

    this.auth.login(this.email, this.password).subscribe({
      next: (res) => {
        console.log('Login success handler called');
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
        console.log('Error handler called');
        console.log('isLoading before reset:', this.isLoading);
        
        try {
          // Handle different error scenarios
          let errorTitle = 'Authentication Failed';
          let errorMessage = 'Invalid email or password';

          if (err.status === 401) {
            errorTitle = 'Invalid Credentials';
            errorMessage = 'The email or password you entered is incorrect. Please try again.';
          } else if (err.status === 0) {
            errorTitle = 'Connection Error';
            errorMessage = 'Unable to connect to the server. Please check your internet connection.';
          } else if (err.status === 500) {
            errorTitle = 'Server Error';
            errorMessage = 'An error occurred on the server. Please try again later.';
          } else if (err.error?.message) {
            errorMessage = err.error.message;
          }

          console.log('Showing toast:', errorTitle, errorMessage);
          this.showToast('error', errorTitle, errorMessage);
          
          console.error('Login error:', {
            status: err.status,
            message: err.error?.message || err.message,
            error: err
          });
        } catch (e) {
          console.error('Exception in error handler:', e);
        } finally {
          // ALWAYS reset loading state, even if there's an exception
          this.isLoading = false;
          console.log('isLoading after reset:', this.isLoading);
          // Force change detection
          this.cdr.detectChanges();
        }
      },
      complete: () => {
        console.log('Observable complete');
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

    // Show notification that admin has been contacted (nzidouha fl backend aussi)
    this.showToast(
      'success',
      'Password Reset Requested',
      `A password reset request has been sent to the ADMIN_RH. You will receive an email at ${this.email} shortly.`,
      7000
    );

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
    console.log('showToast called:', type, title, message);
    const toast: Toast = {
      id: this.toastIdCounter++,
      type,
      title,
      message
    };

    this.toasts.push(toast);
    console.log('Toasts array:', this.toasts);

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