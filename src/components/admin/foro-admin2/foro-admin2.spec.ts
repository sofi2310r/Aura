import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ForoAdmin2 } from './foro-admin2';

describe('ForoAdmin2', () => {
  let component: ForoAdmin2;
  let fixture: ComponentFixture<ForoAdmin2>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ForoAdmin2]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ForoAdmin2);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
