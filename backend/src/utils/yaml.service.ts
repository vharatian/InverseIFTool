import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import YAML from 'yaml';

@Injectable()
export class YamlService {
  read<T = any>(filePath: string): T {
    const absolutePath = path.isAbsolute(filePath)
      ? filePath
      : path.join(process.cwd(), filePath);

    const file = fs.readFileSync(absolutePath, 'utf8');
    return YAML.parse(file) as T;
  }
}
