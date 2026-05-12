import { Injectable, NotFoundException } from '@nestjs/common';
import { SeasonStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSeasonDto } from './dto/create-season.dto';

@Injectable()
export class SeasonsService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateSeasonDto, createdById: string) {
    return this.prisma.season.create({
      data: {
        ...dto,
        status: dto.status ?? SeasonStatus.DRAFT,
        createdById,
      },
    });
  }

  list() {
    return this.prisma.season.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async getById(id: string) {
    const season = await this.prisma.season.findUnique({ where: { id } });
    if (!season) {
      throw new NotFoundException('Season not found');
    }
    return season;
  }

  async updateStatus(id: string, status: SeasonStatus) {
    await this.getById(id);
    return this.prisma.season.update({
      where: { id },
      data: { status },
    });
  }
}
