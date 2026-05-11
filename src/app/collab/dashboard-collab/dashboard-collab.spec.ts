import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardCollab } from './dashboard-collab';

describe('DashboardCollab', () => {
  let component: DashboardCollab;
  let fixture: ComponentFixture<DashboardCollab>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardCollab]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DashboardCollab);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
