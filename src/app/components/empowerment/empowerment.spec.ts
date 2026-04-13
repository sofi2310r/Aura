import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Empowerment } from './empowerment';

describe('Empowerment', () => {
  let component: Empowerment;
  let fixture: ComponentFixture<Empowerment>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [Empowerment]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Empowerment);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
