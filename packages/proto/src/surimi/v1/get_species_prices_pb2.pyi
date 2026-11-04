import datetime

from google.protobuf import timestamp_pb2 as _timestamp_pb2
from surimi.v1 import species_price_pb2 as _species_price_pb2
from google.protobuf import descriptor as _descriptor
from google.protobuf import message as _message
from collections.abc import Mapping as _Mapping
from typing import ClassVar as _ClassVar, Optional as _Optional, Union as _Union

DESCRIPTOR: _descriptor.FileDescriptor

class GetSpeciesPricesRequest(_message.Message):
    __slots__ = ("simulation_id", "date_time")
    SIMULATION_ID_FIELD_NUMBER: _ClassVar[int]
    DATE_TIME_FIELD_NUMBER: _ClassVar[int]
    simulation_id: str
    date_time: _timestamp_pb2.Timestamp
    def __init__(self, simulation_id: _Optional[str] = ..., date_time: _Optional[_Union[datetime.datetime, _timestamp_pb2.Timestamp, _Mapping]] = ...) -> None: ...

class GetSpeciesPricesResponse(_message.Message):
    __slots__ = ("simulation_id", "date_time", "species_price_summary")
    SIMULATION_ID_FIELD_NUMBER: _ClassVar[int]
    DATE_TIME_FIELD_NUMBER: _ClassVar[int]
    SPECIES_PRICE_SUMMARY_FIELD_NUMBER: _ClassVar[int]
    simulation_id: str
    date_time: _timestamp_pb2.Timestamp
    species_price_summary: _species_price_pb2.SpeciesPriceSummary
    def __init__(self, simulation_id: _Optional[str] = ..., date_time: _Optional[_Union[datetime.datetime, _timestamp_pb2.Timestamp, _Mapping]] = ..., species_price_summary: _Optional[_Union[_species_price_pb2.SpeciesPriceSummary, _Mapping]] = ...) -> None: ...
