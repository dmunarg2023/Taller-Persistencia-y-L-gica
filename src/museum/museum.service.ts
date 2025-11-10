/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BusinessError, BusinessLogicException } from '../shared/errors/business-errors';
import { Repository } from 'typeorm';
import { MuseumEntity } from './museum.entity';



@Injectable()
export class MuseumService {
  constructor(
    @InjectRepository(MuseumEntity)
    private readonly museumRepository: Repository<MuseumEntity>,
  ) {}

  async findAllWithFilters(params: {
    city?: string;
    name?: string;
    foundedBefore?: number;
    page?: number;
    limit?: number;
  }): Promise<{ data: MuseumEntity[]; meta: { total: number; page: number; limit: number; pages: number } }> {
    const { city, name, foundedBefore } = params;
    const page = params.page && params.page > 0 ? params.page : 1;
    const limit = params.limit && params.limit > 0 ? params.limit : 10;
    const skip = (page - 1) * limit;

    const qb = this.museumRepository.createQueryBuilder('museum')
      .leftJoinAndSelect('museum.artworks', 'artworks')
      .leftJoinAndSelect('museum.exhibitions', 'exhibitions');

    if (name) qb.andWhere('museum.name LIKE :name', { name: `%${name}%` });
    if (city) qb.andWhere('museum.city LIKE :city', { city: `%${city}%` });
    if (foundedBefore !== undefined) qb.andWhere('museum.foundedBefore < :year', { year: foundedBefore });

    const total = await qb.getCount();
    const data = await qb.skip(skip).take(limit).getMany();
    const pages = Math.max(1, Math.ceil(total / limit));

    return { data, meta: { total, page, limit, pages } };
  }


  async findAll(): Promise<MuseumEntity[]> {
    return await this.museumRepository.find({ relations: ['artworks', 'exhibitions'] });
  }

  async findOne(id: string): Promise<MuseumEntity> {
    const museum = await this.museumRepository.findOne({
      where: { id },
      relations: ['artworks', 'exhibitions'],
    });

    if (!museum)
      throw new BusinessLogicException(
        'The museum with the given id was not found',
        BusinessError.NOT_FOUND,
      );

    return museum;
  }

  async create(museum: MuseumEntity): Promise<MuseumEntity> {
    return await this.museumRepository.save(museum);
  }

  async update(id: string, museum: MuseumEntity): Promise<MuseumEntity> {
    const persistedMuseum = await this.museumRepository.findOne({ where: { id } });
    if (!persistedMuseum)
      throw new BusinessLogicException(
        'The museum with the given id was not found',
        BusinessError.NOT_FOUND,
      );

    return await this.museumRepository.save({ ...persistedMuseum, ...museum });
  }

  async delete(id: string) {
    const museum = await this.museumRepository.findOne({ where: { id } });
    if (!museum)
      throw new BusinessLogicException(
        'The museum with the given id was not found',
        BusinessError.NOT_FOUND,
      );

    await this.museumRepository.remove(museum);
  }
}
