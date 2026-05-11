import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PointsCalendar } from './points-calendar';

describe('PointsCalendar', () => {
  let component: PointsCalendar;
  let fixture: ComponentFixture<PointsCalendar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PointsCalendar]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PointsCalendar);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
