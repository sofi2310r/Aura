import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Foro } from './foro';

describe('Foro', () => {
  let component: Foro;
  let fixture: ComponentFixture<Foro>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [Foro]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Foro);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
