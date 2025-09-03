// src/utils/snowflake.ts
import { Injectable } from '@nestjs/common';

@Injectable()
export class SnowflakeID {
  private epoch = 1672531200000;
  private sequence = 0;
  private lastTimestamp = -1;
  private machineId = 1;

  private getTimestamp(): number {
    return Date.now() - this.epoch;
  }

  generate(): string {
    // instance method, không static
    let timestamp = this.getTimestamp();

    if (timestamp < this.lastTimestamp)
      throw new Error('Clock moved backwards');

    if (timestamp === this.lastTimestamp) {
      this.sequence = (this.sequence + 1) & 0xfff;
      if (this.sequence === 0) {
        while (timestamp <= this.lastTimestamp) timestamp = this.getTimestamp();
      }
    } else {
      this.sequence = 0;
    }

    this.lastTimestamp = timestamp;

    const id =
      (BigInt(timestamp) << 22n) |
      (BigInt(this.machineId) << 12n) |
      BigInt(this.sequence);

    return id.toString();
  }
}
