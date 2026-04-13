import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NuevaPublicacion } from './nueva-publicacion';

describe('NuevaPublicacion', () => {
  let component: NuevaPublicacion;
  let fixture: ComponentFixture<NuevaPublicacion>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [NuevaPublicacion]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NuevaPublicacion);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
