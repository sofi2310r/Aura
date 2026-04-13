import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FooterBanner } from './footer-banner';

describe('FooterBanner', () => {
  let component: FooterBanner;
  let fixture: ComponentFixture<FooterBanner>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FooterBanner]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FooterBanner);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
