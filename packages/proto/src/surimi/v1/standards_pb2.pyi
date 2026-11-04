from surimi.v1 import measurement_pb2 as _measurement_pb2
from google.protobuf import descriptor as _descriptor
from google.protobuf import message as _message
from collections.abc import Mapping as _Mapping
from typing import ClassVar as _ClassVar, Optional as _Optional, Union as _Union

DESCRIPTOR: _descriptor.FileDescriptor

class Standards(_message.Message):
    __slots__ = ("date_and_time", "species_code", "gear_code", "life_stage", "market_code", "currency", "country_code", "category_code", "measurements")
    DATE_AND_TIME_FIELD_NUMBER: _ClassVar[int]
    SPECIES_CODE_FIELD_NUMBER: _ClassVar[int]
    GEAR_CODE_FIELD_NUMBER: _ClassVar[int]
    LIFE_STAGE_FIELD_NUMBER: _ClassVar[int]
    MARKET_CODE_FIELD_NUMBER: _ClassVar[int]
    CURRENCY_FIELD_NUMBER: _ClassVar[int]
    COUNTRY_CODE_FIELD_NUMBER: _ClassVar[int]
    CATEGORY_CODE_FIELD_NUMBER: _ClassVar[int]
    MEASUREMENTS_FIELD_NUMBER: _ClassVar[int]
    date_and_time: str
    species_code: str
    gear_code: str
    life_stage: str
    market_code: str
    currency: str
    country_code: str
    category_code: str
    measurements: _measurement_pb2.Measurement
    def __init__(self, date_and_time: _Optional[str] = ..., species_code: _Optional[str] = ..., gear_code: _Optional[str] = ..., life_stage: _Optional[str] = ..., market_code: _Optional[str] = ..., currency: _Optional[str] = ..., country_code: _Optional[str] = ..., category_code: _Optional[str] = ..., measurements: _Optional[_Union[_measurement_pb2.Measurement, _Mapping]] = ...) -> None: ...
