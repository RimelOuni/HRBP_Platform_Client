import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardManager } from './dashboard-manager';

describe('DashboardManager', () => {
  let component: DashboardManager;
  let fixture: ComponentFixture<DashboardManager>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardManager]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DashboardManager);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
