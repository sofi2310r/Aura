import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AvisoNormas } from './aviso-normas';

describe('AvisoNormas', () => {
  let component: AvisoNormas;
  let fixture: ComponentFixture<AvisoNormas>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AvisoNormas]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AvisoNormas);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
