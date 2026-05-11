import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UserImport } from './user-import';

describe('UserImport', () => {
  let component: UserImport;
  let fixture: ComponentFixture<UserImport>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserImport]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UserImport);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
