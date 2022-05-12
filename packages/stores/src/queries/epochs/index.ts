import { KVStore } from "@keplr-wallet/common";
import {
  ChainGetter,
  ObservableChainQuery,
  QueryResponse,
} from "@keplr-wallet/stores";
import { Epochs } from "./types";
import { computed, observable } from "mobx";
import dayjs from "dayjs";
import { Duration } from "dayjs/plugin/duration";
import { HydrateableStore } from "../../types";

export class ObservableQueryEpochsInner {
  constructor(
    protected readonly identifier: string,
    protected readonly queryEpochs: ObservableQueryEpochs
  ) {}

  @computed
  get epoch(): Epochs["epochs"][0] | undefined {
    return this.queryEpochs.response?.data.epochs.find(
      (epoch) => epoch.identifier === this.identifier
    );
  }

  @computed
  get duration(): Duration | undefined {
    if (!this.epoch) {
      return;
    }

    // Golang Protobuf's duration is returned in seconds only.
    return dayjs.duration(
      parseInt(this.epoch.duration.replace("s", "")) * 1000
    );
  }

  @computed
  get startTime(): Date {
    if (!this.epoch) {
      return new Date(0);
    }

    return new Date(this.epoch.current_epoch_start_time);
  }

  @computed
  get endTime(): Date {
    const startTime = this.startTime;
    if (!this.duration) {
      return startTime;
    }

    return dayjs(startTime).add(this.duration).toDate();
  }
}

export class ObservableQueryEpochs
  extends ObservableChainQuery<Epochs>
  implements HydrateableStore<Epochs>
{
  @observable.shallow
  protected map: Map<string, ObservableQueryEpochsInner> = new Map();

  constructor(kvStore: KVStore, chainId: string, chainGetter: ChainGetter) {
    super(kvStore, chainId, chainGetter, "/osmosis/epochs/v1beta1/epochs");
  }

  hydrate(data: QueryResponse<Epochs>): void {
    this.cancel();
    this.setResponse(data);
  }

  getEpoch(identifier: string) {
    if (!this.map.has(identifier)) {
      const inner = new ObservableQueryEpochsInner(identifier, this);
      this.map.set(identifier, inner);
    }

    return this.map.get(identifier)!;
  }
}

export * from "./types";
