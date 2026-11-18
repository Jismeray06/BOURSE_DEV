import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module.js';

describe('API (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/homepage (GET) renvoie les textes et les actualités sans connexion', async () => {
    const response = await request(app.getHttpServer()).get('/homepage').expect(200);
    expect(response.body).toHaveProperty('content');
    expect(Array.isArray(response.body.news)).toBe(true);
  });

  it('/admin/homepage (GET) est refusé sans jeton', () => {
    return request(app.getHttpServer()).get('/admin/homepage').expect(401);
  });

  afterEach(async () => {
    await app.close();
  });
});
