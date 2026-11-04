from surimi.v1 import value_chain_unit_type_pb2 as _value_chain_unit_type_pb2
from google.protobuf.internal import containers as _containers
from google.protobuf import descriptor as _descriptor
from google.protobuf import message as _message
from collections.abc import Iterable as _Iterable, Mapping as _Mapping
from typing import ClassVar as _ClassVar, Optional as _Optional, Union as _Union

DESCRIPTOR: _descriptor.FileDescriptor

class ValueChainValue(_message.Message):
    __slots__ = ("type", "production", "production_live_weight", "production_value", "other_production_value", "ticket_revenue", "subsidies", "saleries_shares", "input_fish", "input_other", "taxes", "overhead", "jobs_female", "jobs_male", "worker_dependents", "owner_dependents")
    TYPE_FIELD_NUMBER: _ClassVar[int]
    PRODUCTION_FIELD_NUMBER: _ClassVar[int]
    PRODUCTION_LIVE_WEIGHT_FIELD_NUMBER: _ClassVar[int]
    PRODUCTION_VALUE_FIELD_NUMBER: _ClassVar[int]
    OTHER_PRODUCTION_VALUE_FIELD_NUMBER: _ClassVar[int]
    TICKET_REVENUE_FIELD_NUMBER: _ClassVar[int]
    SUBSIDIES_FIELD_NUMBER: _ClassVar[int]
    SALERIES_SHARES_FIELD_NUMBER: _ClassVar[int]
    INPUT_FISH_FIELD_NUMBER: _ClassVar[int]
    INPUT_OTHER_FIELD_NUMBER: _ClassVar[int]
    TAXES_FIELD_NUMBER: _ClassVar[int]
    OVERHEAD_FIELD_NUMBER: _ClassVar[int]
    JOBS_FEMALE_FIELD_NUMBER: _ClassVar[int]
    JOBS_MALE_FIELD_NUMBER: _ClassVar[int]
    WORKER_DEPENDENTS_FIELD_NUMBER: _ClassVar[int]
    OWNER_DEPENDENTS_FIELD_NUMBER: _ClassVar[int]
    type: _value_chain_unit_type_pb2.ValueChainUnitType
    production: float
    production_live_weight: float
    production_value: float
    other_production_value: float
    ticket_revenue: float
    subsidies: float
    saleries_shares: float
    input_fish: float
    input_other: float
    taxes: float
    overhead: float
    jobs_female: float
    jobs_male: float
    worker_dependents: float
    owner_dependents: float
    def __init__(self, type: _Optional[_Union[_value_chain_unit_type_pb2.ValueChainUnitType, str]] = ..., production: _Optional[float] = ..., production_live_weight: _Optional[float] = ..., production_value: _Optional[float] = ..., other_production_value: _Optional[float] = ..., ticket_revenue: _Optional[float] = ..., subsidies: _Optional[float] = ..., saleries_shares: _Optional[float] = ..., input_fish: _Optional[float] = ..., input_other: _Optional[float] = ..., taxes: _Optional[float] = ..., overhead: _Optional[float] = ..., jobs_female: _Optional[float] = ..., jobs_male: _Optional[float] = ..., worker_dependents: _Optional[float] = ..., owner_dependents: _Optional[float] = ...) -> None: ...

class ValueChainYear(_message.Message):
    __slots__ = ("year", "values")
    YEAR_FIELD_NUMBER: _ClassVar[int]
    VALUES_FIELD_NUMBER: _ClassVar[int]
    year: int
    values: _containers.RepeatedCompositeFieldContainer[ValueChainValue]
    def __init__(self, year: _Optional[int] = ..., values: _Optional[_Iterable[_Union[ValueChainValue, _Mapping]]] = ...) -> None: ...

class ValueChainSummary(_message.Message):
    __slots__ = ("value_chain_years",)
    VALUE_CHAIN_YEARS_FIELD_NUMBER: _ClassVar[int]
    value_chain_years: _containers.RepeatedCompositeFieldContainer[ValueChainYear]
    def __init__(self, value_chain_years: _Optional[_Iterable[_Union[ValueChainYear, _Mapping]]] = ...) -> None: ...
