import { IsIn, IsString } from 'class-validator';

export class GenerateAdviceDto {
  @IsIn(['month', 'year'])
  periodType!: 'month' | 'year';

  @IsString()
  periodKey!: string;
}
