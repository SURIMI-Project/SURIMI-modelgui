from surimi.v1 import fleet_segment_pb2 as _fleet_segment_pb2
from surimi.v1 import species_pb2 as _species_pb2
from google.protobuf.internal import containers as _containers
from google.protobuf import descriptor as _descriptor
from google.protobuf import message as _message
from collections.abc import Iterable as _Iterable, Mapping as _Mapping
from typing import ClassVar as _ClassVar, Optional as _Optional, Union as _Union

DESCRIPTOR: _descriptor.FileDescriptor

class TotalAllowableCatch(_message.Message):
    __slots__ = ("species", "fleet_segment", "catch")
    SPECIES_FIELD_NUMBER: _ClassVar[int]
    FLEET_SEGMENT_FIELD_NUMBER: _ClassVar[int]
    CATCH_FIELD_NUMBER: _ClassVar[int]
    species: _species_pb2.Species
    fleet_segment: _fleet_segment_pb2.FleetSegment
    catch: float
    def __init__(self, species: _Optional[_Union[_species_pb2.Species, _Mapping]] = ..., fleet_segment: _Optional[_Union[_fleet_segment_pb2.FleetSegment, _Mapping]] = ..., catch: _Optional[float] = ...) -> None: ...

class RegulationsSummary(_message.Message):
    __slots__ = ("total_allowable_catches",)
    TOTAL_ALLOWABLE_CATCHES_FIELD_NUMBER: _ClassVar[int]
    total_allowable_catches: _containers.RepeatedCompositeFieldContainer[TotalAllowableCatch]
    def __init__(self, total_allowable_catches: _Optional[_Iterable[_Union[TotalAllowableCatch, _Mapping]]] = ...) -> None: ...
