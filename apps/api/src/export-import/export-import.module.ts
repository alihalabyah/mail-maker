import { Module } from '@nestjs/common';
import { ExportImportController } from './export-import.controller';
import { ExportImportService } from './export-import.service';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [StorageModule],
  controllers: [ExportImportController],
  providers: [ExportImportService],
  exports: [ExportImportService],
})
export class ExportImportModule {}
